"""RabbitMQ worker that runs the existing Sentinel-2 monitoring engine."""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Callable
from uuid import UUID

import pika
from pika.adapters.blocking_connection import BlockingChannel

from agrideep_satellite.config import Settings
from agrideep_satellite.exceptions import EngineError
from agrideep_satellite.services.monitoring_service import run_monitoring

logger = logging.getLogger("agrideep_satellite.worker")
REQUEST_QUEUE = os.getenv("ANALYSIS_REQUEST_QUEUE", "agrideep.analysis.requests")
RESULT_QUEUE = os.getenv("ANALYSIS_RESULT_QUEUE", "agrideep.analysis.results")
OUTPUT_DIR = Path(os.getenv("SATELLITE_OUTPUT_DIR", "data/output"))


def process_analysis_message(
    payload: dict[str, Any],
    *,
    publish_event: Callable[[dict[str, Any]], None],
    output_dir: Path = OUTPUT_DIR,
    runner: Callable[..., dict[str, Any]] = run_monitoring,
    settings_factory: Callable[[], Settings] = Settings.from_env,
) -> None:
    job_id = str(UUID(str(payload["job_id"])))
    required_fields = {"geometry", "start_date", "end_date"}
    missing_fields = required_fields.difference(payload)
    if missing_fields:
        raise ValueError(f"Analysis request is missing fields: {sorted(missing_fields)}")
    if not isinstance(payload["geometry"], dict):
        raise ValueError("Analysis request geometry must be a GeoJSON object.")
    publish_event({"job_id": job_id, "status": "RUNNING"})

    try:
        settings = settings_factory()
        job_directory = output_dir / job_id
        result = runner(
            payload["geometry"],
            payload["start_date"],
            payload["end_date"],
            max_cloud_pct=payload.get("max_cloud_pct"),
            output_json=job_directory / "result.json",
            settings=settings,
        )
        if result.get("status") == "ok":
            publish_event({
                "job_id": job_id,
                "status": "COMPLETED",
                "result": result,
            })
            return

        error = result.get("error") or {}
        publish_event({
            "job_id": job_id,
            "status": "FAILED",
            "error_code": error.get("code", "processing_error"),
            "error_message": error.get("message", "Satellite processing did not produce results."),
            "result": result,
        })
    except EngineError as error:
        publish_event({
            "job_id": job_id,
            "status": "FAILED",
            "error_code": error.code,
            "error_message": str(error),
        })
    except Exception:
        logger.exception("Satellite processing failed for job %s", job_id)
        publish_event({
            "job_id": job_id,
            "status": "FAILED",
            "error_code": "processing_error",
            "error_message": "Satellite processing failed; inspect worker logs for details.",
        })


def _publish_result(channel: BlockingChannel, payload: dict[str, Any]) -> None:
    channel.basic_publish(
        exchange="",
        routing_key=RESULT_QUEUE,
        body=json.dumps(payload, allow_nan=False).encode("utf-8"),
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=pika.DeliveryMode.Persistent,
            message_id=payload["job_id"],
        ),
        mandatory=True,
    )


def _handle_delivery(
    channel: BlockingChannel,
    method: pika.spec.Basic.Deliver,
    properties: pika.spec.BasicProperties,
    body: bytes,
) -> None:
    try:
        payload = json.loads(body)
        if not isinstance(payload, dict):
            raise ValueError("Analysis request must be a JSON object.")
        process_analysis_message(
            payload,
            publish_event=lambda event: _publish_result(channel, event),
        )
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        logger.exception("Rejecting malformed satellite analysis request")
        channel.basic_reject(delivery_tag=method.delivery_tag, requeue=False)
        return
    except Exception:
        logger.exception("Could not publish analysis result; requeuing request")
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        return

    channel.basic_ack(delivery_tag=method.delivery_tag)


def _connect() -> pika.BlockingConnection:
    credentials = pika.PlainCredentials(
        os.getenv("RABBITMQ_USERNAME", "agrideep"),
        os.getenv("RABBITMQ_PASSWORD", "agrideep"),
    )
    return pika.BlockingConnection(pika.ConnectionParameters(
        host=os.getenv("RABBITMQ_HOST", "localhost"),
        port=int(os.getenv("RABBITMQ_PORT", "5672")),
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300,
    ))


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    while True:
        connection: pika.BlockingConnection | None = None
        try:
            connection = _connect()
            channel = connection.channel()
            channel.queue_declare(queue=REQUEST_QUEUE, durable=True)
            channel.queue_declare(queue=RESULT_QUEUE, durable=True)
            channel.confirm_delivery()
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(
                queue=REQUEST_QUEUE,
                on_message_callback=_handle_delivery,
                auto_ack=False,
            )
            logger.info("Waiting for satellite analysis requests on %s", REQUEST_QUEUE)
            channel.start_consuming()
        except (pika.exceptions.AMQPConnectionError, OSError):
            logger.exception("RabbitMQ connection failed; retrying in five seconds")
            time.sleep(5)
        finally:
            if connection is not None and connection.is_open:
                connection.close()


if __name__ == "__main__":
    main()

package com.agrideep.backend.exception;

import java.util.UUID;

public class ParcelNotFoundException extends RuntimeException {

	public ParcelNotFoundException(UUID id) {
		super("Parcel " + id + " was not found.");
	}

}

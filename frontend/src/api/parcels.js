const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .replace(/\/+$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  const responseText = await response.text()
  let responseData = null

  if (responseText) {
    try {
      responseData = JSON.parse(responseText)
    } catch {
      if (response.ok) {
        throw new Error('The parcel API returned an invalid response.')
      }
    }
  }

  if (!response.ok) {
    const message = responseData?.error?.message
      || responseData?.message
      || `Parcel request failed (${response.status} ${response.statusText}).`
    throw new Error(message)
  }

  return responseData
}

export async function getParcels(signal) {
  const parcels = await request('/parcels', { signal })
  if (!Array.isArray(parcels)) {
    throw new Error('The parcel API returned an invalid parcel list.')
  }
  return parcels
}

export async function getParcel(id, signal) {
  const parcel = await request(`/parcels/${encodeURIComponent(id)}`, { signal })
  if (!parcel || typeof parcel !== 'object' || typeof parcel.id !== 'string') {
    throw new Error('The parcel API returned an invalid parcel.')
  }
  return parcel
}

export async function createParcel({ name, geometry }) {
  const parcel = await request('/parcels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, geometry }),
  })
  if (!parcel || typeof parcel !== 'object' || typeof parcel.id !== 'string') {
    throw new Error('The parcel API did not return the saved parcel.')
  }
  return parcel
}

export async function getAnalyses(parcelId, signal) {
  const jobs = await request(`/parcels/${encodeURIComponent(parcelId)}/analyses`, { signal })
  if (!Array.isArray(jobs)) {
    throw new Error('The analysis API returned an invalid job list.')
  }
  return jobs
}

export async function getAnalysis(id, signal) {
  const job = await request(`/analyses/${encodeURIComponent(id)}`, { signal })
  if (!job || typeof job !== 'object' || typeof job.id !== 'string') {
    throw new Error('The analysis API returned an invalid job.')
  }
  return job
}

export async function createAnalysis(parcelId, requestBody) {
  const response = await fetch(
    `${API_BASE_URL}/parcels/${encodeURIComponent(parcelId)}/analyses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    },
  )
  const responseText = await response.text()
  let responseData = null

  if (responseText) {
    try {
      responseData = JSON.parse(responseText)
    } catch {
      if (response.ok) throw new Error('The analysis API returned an invalid response.')
    }
  }

  if (!response.ok) {
    const message = responseData?.error?.message
      || responseData?.message
      || `Analysis request failed (${response.status} ${response.statusText}).`
    throw new Error(message)
  }
  if (!responseData || typeof responseData.id !== 'string') {
    throw new Error('The analysis API did not return the created job.')
  }
  return responseData
}

export function getAnalysisArtifactUrl(jobId, name) {
  return `${API_BASE_URL}/analyses/${encodeURIComponent(jobId)}/artifacts/${encodeURIComponent(name)}`
}

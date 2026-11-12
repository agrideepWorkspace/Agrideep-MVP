export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .replace(/\/+$/, '')

// Calls the Spring API and returns the parsed JSON body. Failed requests throw an Error
// carrying the API's {"error": {"message": ...}} text, which the pages show to the user.
export async function requestJson(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  const responseText = await response.text()
  let responseData = null

  if (responseText) {
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = null
    }
  }

  if (!response.ok) {
    const message = responseData?.error?.message
      || responseData?.message
      || `Request failed (${response.status} ${response.statusText}).`
    throw new Error(message)
  }

  return responseData
}

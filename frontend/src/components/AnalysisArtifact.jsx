import { useEffect, useState } from 'react'
import { authorizedFetch } from '../auth.js'
import { getAnalysisArtifactUrl } from '../api/parcels.js'

export function AnalysisArtifactImage({ jobId, name, alt }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let objectUrl
    let active = true
    authorizedFetch(getAnalysisArtifactUrl(jobId, name))
      .then((response) => {
        if (!response.ok) throw new Error('Could not load the analysis image.')
        return response.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (active) setSrc(objectUrl)
      })
      .catch(() => setSrc(''))
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [jobId, name])

  return <img src={src || undefined} alt={alt} />
}

export function DownloadAnalysisArtifact({ jobId, name, children }) {
  const download = async () => {
    const response = await authorizedFetch(getAnalysisArtifactUrl(jobId, name))
    if (!response.ok) throw new Error('Could not download the analysis file.')
    const objectUrl = URL.createObjectURL(await response.blob())
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = name
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  return <button type="button" onClick={() => download().catch(() => {})} className="artifactDownload">
    {children}
  </button>
}

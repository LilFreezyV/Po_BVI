async function load(path) {
  const response = await fetch('./olympiad-content/' + path)
  if (!response.ok) throw new Error('Archive data unavailable')
  return response.json()
}

let indexRequest
export function loadArchiveIndex() {
  indexRequest ??= load('index.json').catch((error) => {
    indexRequest = undefined
    throw error
  })
  return indexRequest
}

export const loadArchiveTasks = (file) => load('variants/' + encodeURIComponent(file))
export const archiveSeasonPath = (id, season) => '/archive/' + id + '/' + season.replace('/', '-')

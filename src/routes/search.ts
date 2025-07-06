import { Router } from 'express'
import { SessionFileReader } from '../utils/fileReader'
import { SearchEngine } from '../utils/search'

export function searchRoutes(fileReader: SessionFileReader): Router {
  const router = Router()
  const searchEngine = new SearchEngine()

  router.get('/', async (req, res) => {
    try {
      const query = req.query.q as string
      const projectFilter = req.query.project as string

      if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' })
      }

      let sessions = await fileReader.getAllSessions()

      // Filter by project if specified
      if (projectFilter && projectFilter !== 'all') {
        sessions = sessions.filter((s) => s.project === projectFilter)
      }

      const results = searchEngine.search(sessions, query)

      res.json({
        query,
        total: results.length,
        results: results.slice(0, 50),
      })
    } catch (error) {
      console.error('Search error:', error)
      res.status(500).json({ error: 'Search failed' })
    }
  })

  return router
}

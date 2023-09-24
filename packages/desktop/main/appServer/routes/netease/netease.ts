import cache from '../../../cache'
import log from '@/desktop/main/log'
import { CacheAPIs } from '@/shared/CacheAPIs'
import { pathCase, snakeCase } from 'change-case'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import NeteaseCloudMusicApi from 'NeteaseCloudMusicApi'
import request from '../../request'
// const match = require('@unblockneteasemusic/server');


log.info('[electron] appServer/routes/netease.ts')

async function netease(fastify: FastifyInstance) {
  const getHandler = (name: string, neteaseApi: (params: any) => any) => {
    return async (
      req: FastifyRequest<{ Querystring: { [key: string]: string } }>,
      reply: FastifyReply
    ) => {
      log.info('netease api name ',name,' params ',neteaseApi)
      // Get track details from cache
      if (name === CacheAPIs.Track) {
        const cacheData = await cache.get(name, req.query as any)
        
        if (cacheData) {
          return cacheData
        }
      }

      // Request netease api
      try {
        
        const result = await neteaseApi({
          ...req.query,
          cookie: req.cookies,
        })
        
        cache.set(name as CacheAPIs, result.body, req.query)

        return reply.send(result.body)
      } catch (error: any) {

        // TODO: 能够请求 明天改改
        // match(1317494434, ['kuwo', 'migu']).then(console.log)
        if ([400, 301].includes(error.status)) {
          return reply.status(error.status).send(error.body)
        }
        return reply.status(500)
      }
    }
  }

  // 循环注册NeteaseCloudMusicApi所有接口
  Object.entries(NeteaseCloudMusicApi).forEach(([nameInSnakeCase, neteaseApi]: [string, any]) => {
    // 例外
    if (
      ['serveNcmApi', 'getModulesDefinitions', snakeCase(CacheAPIs.SongUrl)].includes(
        nameInSnakeCase
      )
    ) {
      return
    }

    const name = pathCase(nameInSnakeCase)
    const handler = getHandler(name, neteaseApi)

    fastify.get(`/netease/${name}`, handler)
    fastify.post(`/netease/${name}`, handler)
  })

  fastify.get('/netease', () => 'NeteaseCloudMusicApi')
}

export default netease

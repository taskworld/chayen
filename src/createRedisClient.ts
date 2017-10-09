import * as Redis from 'ioredis'

function createRedisSentinelClient (sentinelUrls: { host: string, port: number }[], sentinelMasterName: string) {
  return new Redis({
    sentinels: sentinelUrls,
    name: sentinelMasterName
  })
}

function createRedisNormalClient (redisUrl: string) {
  return new Redis(redisUrl)
}

function formatRedisUrl (url: string) {
  const [ host, port ] = url.split(':')
  return { host, port: parseInt(port, 10) }
}

export default function createRedisClient (redisUrl: string = 'redis://localhost:6379', sentinelMasterName: string = 'mymaster') {
  if (!redisUrl.includes(',')) {
    return createRedisNormalClient(redisUrl)
  }

  const sentinelUrls = redisUrl
    .split('//')[1]
    .split(',')
    .map(url => formatRedisUrl(url))

  return createRedisSentinelClient (sentinelUrls, sentinelMasterName)
}

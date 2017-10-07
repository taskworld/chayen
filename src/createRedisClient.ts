import * as Redis from 'ioredis'

function createRedisSentinelClient (sentinelUrls, sentinelMasterName) {
  return new Redis({
    sentinels: sentinelUrls,
    name: sentinelMasterName
  })
}

function createRedisNormalClient (redisUrl) {
  return new Redis(redisUrl)
}

function formatRedisUrl (url) {
  const [ host, port ] = url.split(':')
  return { host, port }
}

export default function createRedisClient (redisUrl: string = 'redis://localhost:6379', sentinelMasterName: string = 'mymaster') {
  if (!redisUrl.includes(',')) {
    return createRedisNormalClient(redisUrl)
  }

  const sentinelUrls = redisUrl
    .split('//')[1]
    .split(',')
    .map(url => formatRedisUrl(url))

  return createRedisSentinelClient(sentinelUrls, sentinelMasterName)
}

import fs from 'node:fs'

if (!global.segment) {
  try {
    global.segment = (await import('oicq')).segment
  } catch (err) {
    global.segment = (await import('icqq')).segment
  }
}

logger.info(logger.magenta('= ================================================ ='))
logger.info(logger.yellow('= Bili-Summary-plugin is loading. ='))
logger.info(logger.magenta('= ================================================ ='))
logger.info(logger.yellow('= Welcome to use the Bili-Summary-plugin. ='))
logger.info(logger.yellow('= https://gitee.com/Liccsu/BiliBili-Summary-plugin ='))
logger.info(logger.magenta('= ================================================ ='))

const files = fs
  .readdirSync('./plugins/bili-summary-plugin/apps')
  .filter((file) => file.endsWith('.js'))

let ret = []
files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status !== 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }

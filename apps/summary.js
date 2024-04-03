import plugin from '../../../lib/plugins/plugin.js'
import { Networks } from '../model/networks.js'
import { Wbi } from '../model/wbi.js'
import { Time } from '../model/time.js'

const regExpResolveTemp = 'b23.tv/[0-9A-Za-z]{7}'
const regExpResolveBV = 'BV[0-9A-Za-z]{10}'
const regExpResolveAV = 'av[0-9]{1,10}'

export class Summary extends plugin {
  constructor () {
    super({
      name: 'B站视频总结',
      dsc: '对B站视频进行解析并使用AI对视频内容进行总结',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: regExpResolveTemp, // 临时
          fnc: 'resolveTemp',
          event: 'message'
        },
        {
          reg: regExpResolveBV, // BV长期
          fnc: 'resolveBV',
          event: 'message'
        },
        {
          reg: regExpResolveAV, // AV长期
          fnc: 'resolveAV',
          event: 'message'
        }
      ]
    })
    this.resolveTemp = this.resolveTemp.bind(this)
    this.resolve = this.resolve.bind(this)
  }

  async resolveTemp (e) {
    const urlMatched = e.msg.match(new RegExp(regExpResolveTemp))
    if (!urlMatched) {
      return
    }

    const network = new Networks({
      url: `https://${urlMatched[0]}`,
      redirect: 'manual'
    })

    network.performRequest()
      .then(response => {
        console.log(response.headers)
        const location = response.headers.get('location')
        if (location) {
          const regExp = `(${regExpResolveAV})|(${regExpResolveBV})`
          const matched = location.match(new RegExp(regExp))
          if (matched) {
            this.resolve(e, matched[0])
          }
        }
      })
      .catch(err => {
        logger.warn('发生错误:', err)
      })
  }

  async resolveBV (e) {
    const BVMatched = e.msg.match(new RegExp(regExpResolveBV))
    if (BVMatched) {
      await this.resolve(e, BVMatched[0])
    }
  }

  async resolveAV (e) {
    const AVMatched = e.msg.match(new RegExp(regExpResolveAV))
    if (AVMatched) {
      await this.resolve(e, AVMatched[0])
    }
  }

  async resolve (e, vid) {
    let url = 'https://api.bilibili.com/x/web-interface/view?'
    if (vid.startsWith('BV')) {
      url += `bvid=${vid}`
    } else if (vid.startsWith('av')) {
      url += `aid=${vid.substring(2)}`
    } else {
      logger.warn('参数异常:', vid)
      return
    }
    let res = await new Networks({ url: url }).getData()
    if (res.code !== 0) {
      logger.warn('视频信息解析失败:code ', res.code)
      return
    }
    let videoInfo = res.data
    let msg = [
      segment.image(videoInfo.pic),
      `标题:${videoInfo.title}\n`,
      `简介:${videoInfo.desc}\n`,
      `UP主:${videoInfo.owner.name}\n`,
      `UID:${videoInfo.owner.mid}\n`,
      `AV号:av${videoInfo.aid}\n`,
      `BV号:${videoInfo.bvid}\n`,
      `发布时间:${Time.formatDate(videoInfo.pubdate)}\n`,
      `时长:${Time.formatDuration(videoInfo.duration)}\n`,
      `播放:${videoInfo.stat.view} | 点赞:${videoInfo.stat.like}\n`,
      `投币:${videoInfo.stat.coin} | 收藏:${videoInfo.stat.favorite}\n`,
      `评论:${videoInfo.stat.reply} | 分享:${videoInfo.stat.share}`
    ]

    const query = await new Wbi({
      bvid: videoInfo.bvid,
      cid: videoInfo.cid,
      up_mid: videoInfo.owner.mid
    }).getQuery()
    url = 'https://api.bilibili.com/x/web-interface/view/conclusion/get?' + query
    res = await new Networks({ url: url }).getData()
    if (res.code !== 0) {
      /*
       * 0: 成功
       * -400：请求错误
       * -403: 访问权限不足
       */
      logger.warn('视频信息解析失败:code ', res.code)
    } else {
      let {
        code,
        model_result
      } = res.data
      if (code !== 0) {
        /*
         * -1: 不支持AI摘要（敏感内容等）或其他因素导致请求异常
         * 0: 有摘要
         * 1：无摘要（未识别到语音）
         */
        logger.warn('不支持AI摘要或无摘要或其他因素导致请求异常:code ', code)
      } else {
        let {
          result_type,
          summary,
          outline
        } = model_result
        if (result_type === 0) {
          /*
           * 0: 没有摘要
           * 1：仅存在摘要总结
           * 2：存在摘要以及提纲
           */
          logger.warn('没有摘要:code ', code)
        } else {
          msg.push(`\n内容概括:${summary}`)
          if (result_type === 2 && outline) {
            msg.push(`\n==========分段提纲==========`)
            outline.forEach(part => {
              let {
                title,
                part_outline
              } = part
              msg.push(`\n🏷️${title}`)
              part_outline.forEach(cont => {
                msg.push(`\n  ${Time.formatDuration(cont.timestamp)} ${cont.content}`)
              })
            })
          }
        }
      }
    }

    await e.reply(msg)
  }
}

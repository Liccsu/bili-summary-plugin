import md5 from 'md5'

export class Wbi {
  constructor (params) {
    this.aid = params.aid || null // aid与bvid必须至少有一个
    this.bvid = params.bvid || null // aid与bvid必须至少有一个
    this.cid = params.cid
    this.up_mid = params.up_mid
  }

  static mixinKeyEncTab = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
  ]

  static getMixinKey (orig) {
    return Wbi.mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32)
  }

  encWbi (params, imgKey, subKey) {
    const mixinKey = Wbi.getMixinKey(imgKey + subKey)
    const currTime = Math.round(Date.now() / 1000)
    const chrFilter = /[!'()*]/g

    Object.assign(params, { wts: currTime }) // 添加 wts 字段
    // 按照 key 重排参数
    const query = Object
      .keys(params)
      .sort()
      .filter(key => !!params[key])
      .map(key => {
        // 过滤 value 中的 "!'()*" 字符
        const value = params[key].toString().replace(chrFilter, '')
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      })
      .join('&')

    const wbiSign = md5(query + mixinKey) // 计算 w_rid

    return query + '&w_rid=' + wbiSign
  }

  async getWbiKeys () {
    const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      headers: {
        // SESSDATA 字段
        Cookie: 'SESSDATA=114514'
      }
    })
    const {
      data: {
        wbi_img: {
          img_url: imgUrl,
          sub_url: subUrl
        }
      }
    } = await res.json()

    return {
      // eslint-disable-next-line camelcase
      imgKey: imgUrl.slice(
        // eslint-disable-next-line camelcase
        imgUrl.lastIndexOf('/') + 1,
        // eslint-disable-next-line camelcase
        imgUrl.lastIndexOf('.')
      ),
      // eslint-disable-next-line camelcase
      subKey: subUrl.slice(
        // eslint-disable-next-line camelcase
        subUrl.lastIndexOf('/') + 1,
        // eslint-disable-next-line camelcase
        subUrl.lastIndexOf('.')
      )
    }
  }

  async getQuery () {
    const {
      imgKey,
      subKey
    } = await this.getWbiKeys()
    const params = {
      aid: this.aid,
      bvid: this.bvid,
      cid: this.cid,
      up_mid: this.up_mid
    }
    return this.encWbi(params, imgKey, subKey)
  }
}

import fetch from 'node-fetch'
import https from 'https'

export class Networks {
  constructor (data) {
    this.url = data.url
    this.headers = data.headers || {}
    this.type = data.type || 'json'
    this.method = data.method || 'get'
    this.body = data.body || null
    this.agent = data.isAgent ? new https.Agent({ rejectUnauthorized: false }) : null
    this.timeout = data.timeout || 15000
    // 默认为"follow"自动跟随重定向，设置为"manual"手动处理重定向
    this.redirect = data.redirect || 'follow'
  }

  get config () {
    let config = {
      headers: this.headers,
      method: this.method.toUpperCase(),
      agent: this.agent,
      redirect: this.redirect // 使用构造函数中的redirect设置
    }
    if (this.body && this.method.toLowerCase() === 'post') {
      config.body = JSON.stringify(this.body)
    }
    return config
  }

  async performRequest () {
    try {
      const response = await this.timeOut(this.timeout)
      if (response.ok || ((response.status === 301 || response.status === 302) && this.redirect === 'manual')) {
        return response
      } else {
        return {
          status: response.status,
          message: response.statusText || '请求错误'
        }
      }
    } catch (error) {
      return {
        status: 500,
        message: '请求错误'
      }
    }
  }

  async timeOut (time) {
    const abortController = new AbortController()
    const id = setTimeout(() => abortController.abort(), time)
    try {
      const response = await fetch(this.url, {
        ...this.config,
        signal: abortController.signal
      })
      clearTimeout(id)
      return response
    } catch (error) {
      // eslint-disable-next-line no-throw-literal
      throw {
        message: '请求超时',
        status: 504
      }
    }
  }

  async getData () {
    const response = await this.performRequest()
    return this.dealType(response)
  }

  dealType (response) {
    switch (this.type) {
      case 'json':
        return response.json()
      case 'text':
        return response.text()
      case 'arrayBuffer':
        return response.arrayBuffer()
      case 'blob':
        return response.blob()
      default:
        throw new Error('未知的响应类型')
    }
  }
}

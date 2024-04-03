export class Time {
  // 将秒级时间戳格式化为易读的 yyyy-MM-dd HH:mm:ss 形式
  static formatDate (timestamp) {
    // 将秒级时间戳转换为毫秒
    const date = new Date(timestamp * 1000)

    const year = date.getFullYear()
    // 格式化每段为2位字符，不足补'0'
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  // 将秒级时长数格式化为易读的 Xh Ym Zs 形式
  static formatDuration (seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    let result = ''

    if (hours > 0) {
      result += `${hours}h `
    }

    if (hours > 0 || minutes > 0) {
      result += `${minutes}m `
    }

    result += `${remainingSeconds}s`

    return result.trim()
  }
}

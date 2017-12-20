'use strict'

const ws = require('ws')
const UUID = require('uuid')
const EventEmitter = require('events');

const WxServer = 'ws://api.batorange.com/ws'

/**
 * 微信ipad协议访问类
 *
 * @class Wx
 * @extends {EventEmitter}
 */
class Wx extends EventEmitter {

  /**
   * Creates an instance of Wx.
   * @param {String} [address] 远程服务器地址,如ws://127.0.0.1:8080/ws
   * @memberof Wx
   */
  constructor(address = WxServer) {
    super()
    this._event = new EventEmitter()
    this._timeout = 5000 // 向ws服务器提交指令后，返回结果的超时时间，单位毫秒
    this.ws = new ws(address)
    this._On()
  }
  _On() {
    this.ws
      .on('open', () => {
        this.emit('open')
      })
      .on('close', () => {
        this.emit('close')
      })
      .on('message', msg => {
        let data
        try {
          if (typeof msg === 'string') {
            data = JSON.parse(msg)
          } else {
            throw new Error('ws传输的数据不是字符串格式！')
          }
        } catch (e) {
          this.emit('error', new Error('解析msg数据失败: ' + e.message))
        }
        this._onMsg(data)
      })
      .on('error', e => {
        this.emit('error', e)
      })
  }

  async _onMsg(data) {
    if (data.cmdId) {
      // 指令的执行结果
      this._event.emit(data.cmdId, data)
      return
    }
    let tmp
    let ret
    let content
    switch (data.event) {
      case 'cmdRet':
        console.warn('捕捉到未包含cmdId的操作返回: ', data)
        this.emit('error', new Error('捕捉到未包含cmdId的操作返回'))
        break;
      case 'error':
        this.emit('error', new Error('服务器返回错误提示：' + data.msg))
        break
      case 'qrcode': // 微信扫码登陆，推送二维码
      case 'scan': // 微信账号扫码事件
      case 'login': // 微信账号登陆成功
      case 'reconnect': // 重连成功（账号已经登陆，自行判断是否需要同步通讯录）
      case 'loaded': // 通讯录载入完毕
      case 'logout': // 微信账号退出
      case 'sns': // 朋友圈事件：新评论
        this.emit(data.event, data.data || {}, data.msg)
        break
      case 'push':
        if (!data.data || !Array.isArray(data.data) || data.data.length <= 0) {
          this.emit('error', new Error('推送数据异常！'))
          break
        }
        data.data.forEach(i => {
          this.emit('push', i)
        })
        break
      default:
        this.emit('other', data)
        break
    }
  }


  _send(data, cb) {
    if (!data.cmdId) {
      data.cmdId = UUID.v1()
    }
    this._event.once(data.cmdId, ret => {
      cb(null, ret)
    })
    this.ws.send(JSON.stringify(data), e => {
      if (e) {
        cb(new Error('发送失败: ' + e.message))
      }
    })
  }

  async _asyncSend(data, timeout = this._timeout) {
    const tmp = UUID.v1()
    // console.time(tmp)
    return await new Promise((res, rej) => {
      let ok = false
      setTimeout(() => {
        if (ok) { return }
        ok = true
        // console.timeEnd(tmp)
        rej(new Error('请求超时！'))
      }, timeout);
      this._send(data, (err, ret) => {
        if (ok) { return }
        ok = true
        // console.timeEnd(tmp)
        if (err) {
          rej(err)
        } else {
          res(ret)
        }
      })
    })
  }

  /**
   *  发送指令，并返回执行结果
   *
   * 需要注意捕捉catch，请求结果超时或发送失败
   *
   * @param {String} command 指令
   * @param {String | Object | Null} data 指令附加数据
   * @returns {Promise} 返回请求结果json对象。
   * @memberof Wx
   */

  async send(command, data = null) {
    if (!command) {
      throw new Error('未指定操作指令！')
    }
    return await this._asyncSend({
      code: command,
      data,
    })
      .catch(e => {
        throw e
      })
  }

  /**
   * 验证授权
   *
   * 需要注意：连接ws后，需要在10秒内验证授权，否则服务器端会关闭连接。
   *
   * 需要注意捕捉catch
   *
   * @param {String} key 授权key
   * @returns {Promise} 返回授权结果Boolean值
   * @memberof Wx
   */

  async auth(key) {
    if (!key) {
      throw new Error('请提供访问授权key！')
    }
    const ret = await this._asyncSend({
      code: 'connect',
      authKey: key,
    })
      .catch(e => {
        throw e
      })
    return ret && ret.success
  }
}

module.exports = Wx

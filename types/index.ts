export interface IPlocationOptions {
  /**
   * 后端 api 地址
   */
  api: string

  /**
   * 数据库来源，ip-api 或者 ip-taobao，默认 ip-api
   * @default "ip-api"
   */
  data?: string
}
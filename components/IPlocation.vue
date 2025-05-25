<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useAddonIPlocation } from '../client'

// 常量定义
const { api, data } = useAddonIPlocation().value
const FETCH_TIMEOUT = 5000
const LOADING_TEXT = '检测中...'
const TIMEOUT_VALUE = { ip: '超时', address: '' }
const API_ENDPOINTS = {
  priority: 'https://test.itdog.cn/',
  ipv4: 'https://ipv4_ct.itdog.cn/',
  ipv6: 'https://ipv6.itdog.cn/'
}

// 类型定义
type TraceItem = { label: string; value: string }
type TraceInfo = string | TraceItem[]
type IpData = { ip: string; address: string }

interface NodeInfo {
  id: string
  label: string
  v4Url: string
  v6Url: string
  v4Value: string
  v6Value: string
}

// 响应式状态
const ipPriority = ref(LOADING_TEXT)
const ipv4 = ref(LOADING_TEXT)
const ipv4Addr = ref('')
const ipTraceInfo = ref<TraceInfo>(LOADING_TEXT)
const webrtcLeak = ref(LOADING_TEXT)
const ipv6 = ref(LOADING_TEXT)
const ipv6Addr = ref('')
const osType = ref(LOADING_TEXT)
const ua = ref('')

// 加载骨架
const IP_TRACE_LOADING_SKELETON: TraceItem[] = [
  { label: '国家/地区', value: LOADING_TEXT },
  { label: '省份', value: LOADING_TEXT },
  { label: '城市', value: LOADING_TEXT },
  { label: '经纬度', value: LOADING_TEXT },
  { label: 'ISP', value: LOADING_TEXT },
  { label: '组织', value: LOADING_TEXT },
]

// 节点测试数据
const nodeTestData = ref<NodeInfo[]>([
  {
    id: 'itdog_cm',
    label: '国内',
    v4Url: 'https://ipv4_cm.itdog.cn/',
    v6Url: 'https://ipv6_cm.itdog.cn/',
    v4Value: LOADING_TEXT,
    v6Value: LOADING_TEXT,
  },
  {
    id: 'itdog_overseas',
    label: '港澳台',
    v4Url: 'https://ipv4-overseas.itdog.plus/',
    v6Url: 'https://ipv6-overseas.itdog.plus/',
    v4Value: LOADING_TEXT,
    v6Value: LOADING_TEXT,
  },
  {
    id: 'lvhai',
    label: '海外',
    v4Url: 'https://ipv4.lvhai.org/',
    v6Url: 'https://ipv6.lvhai.org/',
    v4Value: LOADING_TEXT,
    v6Value: LOADING_TEXT,
  },
])

// 工具函数
const detectOS = (userAgent: string): string => {
  const uaLower = userAgent.toLowerCase()
  
  // Windows 检测
  if (/windows nt/.test(uaLower)) {
    const version = {
      '10.0': '10',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.2': 'Server 2003/XP x64',
      '5.1': 'XP',
      '5.0': '2000'
    }[/windows nt ([\d.]+)/i.exec(uaLower)?.[1] || '']
    if (uaLower.includes('windows 11') || uaLower.includes('windows nt 10.0; win64')) {
        return 'Windows 11'
    }
    return `Windows${version ? ' ' + version : ''}`
  }
  
  // Android 检测
  if (/android/.test(uaLower)) {
    const version = /android ([\d.]+)/i.exec(uaLower)?.[1]
    return `Android${version ? ' ' + version : ''}`
  }
  
  // iOS 检测
  if (/iphone|ipad|ipod/.test(uaLower)) {
    const version = /os ([\d_]+)/i.exec(uaLower)?.[1]?.replace(/_/g, '.')
    return `iOS${version ? ' ' + version : ''}`
  }
  
  // Linux 检测
  if (/linux/.test(uaLower) && !/android/.test(uaLower)) {
    const distros = {
      ubuntu: 'Ubuntu',
      fedora: 'Fedora',
      debian: 'Debian',
      suse: 'SUSE',
      arch: 'Arch Linux',
      centos: 'CentOS'
    }
    for (const [key, name] of Object.entries(distros)) {
      if (uaLower.includes(key)) return name
    }
    return 'Linux'
  }
  
  // macOS 检测
  if (/macintosh|mac os x/.test(uaLower)) {
    const version = /mac os x ([\d._]+)/i.exec(uaLower)?.[1]?.replace(/_/g, '.')
    return `macOS${version ? ' ' + version : ''}`
  }
  
  return '未知系统'
}

const isPrivateIP = (ip: string): boolean => {
  return /^10\./.test(ip) || 
         /^192\.168\./.test(ip) || 
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) || 
         /^127\./.test(ip)
}

// 网络请求函数
async function fetchWithTimeout<T>(url: string, timeoutMs = FETCH_TIMEOUT): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (!response.ok) throw new Error(`请求失败: ${url}`)
    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    console.error(`请求错误 ${url}:`, error)
    throw error
  }
}

async function fetchIpData(url: string, timeoutMs = FETCH_TIMEOUT): Promise<IpData> {
  try {
    const data: IpData = await fetchWithTimeout(url, timeoutMs)
    return { 
      ip: data.ip || '无', 
      address: data.address || '' 
    }
  } catch (error) {
    console.error(`获取IP数据失败 ${url}:`, error)
    return { ip: '获取失败', address: '' }
  }
}

async function fetchIpTrace(ip: string): Promise<TraceInfo> {
  try {
    const url = `${api}?ip=${ip}&service=${data}`
    const trace = await fetchWithTimeout(url)
    return formatTraceInfo(trace)
  } catch (error) {
    console.error('IP溯源失败:', error)
    return '溯源请求失败'
  }
}

// 数据处理函数
const formatTraceInfo = (trace: any): TraceInfo => {
  if (!trace || (data === 'ip-taobao' ? trace.code !== 0 : trace.status !== 'success')) return '无地理信息'
  
  const traceData = data === 'ip-taobao' ? trace.data : trace
  const infoArray: TraceItem[] = []
  
  if (data === 'ip-taobao') {
    infoArray.push({ label: '国家/地区', value: traceData.country })
    infoArray.push({ label: '省份', value: traceData.region })
    infoArray.push({ label: '城市', value: traceData.city })
    infoArray.push({ label: 'ISP', value: traceData.isp })
  } else {
    infoArray.push({ label: '国家/地区', value: traceData.country })
    infoArray.push({ label: '省份', value: traceData.regionName })
    infoArray.push({ label: '城市', value: traceData.city })
    infoArray.push({ label: '经纬度', value: `${traceData.lat.toFixed(4)}, ${traceData.lon.toFixed(4)}` })
    infoArray.push({ label: 'ISP', value: traceData.isp })
    infoArray.push({ label: '组织', value: traceData.org })
  }
  
  return infoArray.length > 0 ? infoArray : '无地理信息'
}

const getTraceSummaryFromArray = (traceDetails: TraceItem[]): string => {
  const relevantLabels = ['国家/地区', '省份', '城市']
  const parts: string[] = []
  const seenValues = new Set<string>()

  for (const label of relevantLabels) {
    const item = traceDetails.find(td => td.label === label)
    if (item?.value && item.value !== LOADING_TEXT && !seenValues.has(item.value)) {
      parts.push(item.value)
      seenValues.add(item.value)
    }
  }

  if (parts.length > 0) {
    return parts.join(', ')
  }

  // 备选方案：如果没有找到相关部分，但数组不为空
  const allValues = traceDetails
    .map(item => item.value)
    .filter(v => v && v !== LOADING_TEXT)
  
  return allValues.length > 0 ? allValues.join(', ') : '地理信息处理失败'
}

// WebRTC泄露检测
const detectWebRTCLeak = async (publicIpv4: string) => {
  // 检查前提条件
  if (!publicIpv4) {
    webrtcLeak.value = '无法检测 (无 IPv4)'
    return
  }
  if (typeof RTCPeerConnection === 'undefined') {
    webrtcLeak.value = 'WebRTC 已被禁用'
    return
  }
  
  let foundLeak = false
  let rtc: RTCPeerConnection | null = null
  
  try {
    // 创建RTC连接
    rtc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    rtc.createDataChannel('')
    await rtc.createOffer().then(offer => (rtc as any).setLocalDescription(offer))
    
    // 设置超时
    const timeoutPromise = new Promise<void>(resolve => {
      setTimeout(() => {
        if (!foundLeak && rtc && rtc.iceGatheringState !== 'complete') {
          webrtcLeak.value = 'WebRTC 检测超时或无候选'
          if (rtc) rtc.close()
          rtc = null
          resolve()
        }
      }, FETCH_TIMEOUT)
    })
    
    // 处理ICE候选
    const candidatePromise = new Promise<void>(resolve => {
      if (!rtc) return resolve()
      
      rtc.onicecandidate = async (evt) => {
        if (foundLeak || !rtc) return
        
        if (evt?.candidate?.candidate) {
          const ipMatch = evt.candidate.candidate.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3})/)
          if (ipMatch) {
            const leakedIp = ipMatch[1]
            if (leakedIp !== publicIpv4 && !isPrivateIP(leakedIp)) {
              foundLeak = true
              webrtcLeak.value = `发现 WebRTC 泄露：${leakedIp}，查询中...`
              
              try {
                const traceDetails = await fetchIpTrace(leakedIp)
                const traceSummary = typeof traceDetails === 'string' 
                  ? traceDetails 
                  : getTraceSummaryFromArray(traceDetails)
                  
                webrtcLeak.value = `发现 WebRTC 泄露：${leakedIp}（${traceSummary}）`
              } catch (error) {
                webrtcLeak.value = `发现 WebRTC 泄露：${leakedIp}（溯源失败）`
              }
              
              if (rtc) rtc.close()
              rtc = null
              resolve()
            }
          }
        } else if (!foundLeak && evt && !evt.candidate) {
          webrtcLeak.value = '未发现 WebRTC 泄露'
          if (rtc) rtc.close()
          rtc = null
          resolve()
        }
      }
    })
    
    // 等待结果或超时
    await Promise.race([candidatePromise, timeoutPromise])
  } catch (error) {
    console.error('WebRTC 检测错误:', error)
    webrtcLeak.value = 'WebRTC 检测失败'
    if (rtc) rtc.close()
  }
}

// 数据获取函数
async function fetchIpPriorityData() {
  try {
    const data: any = await fetchWithTimeout(API_ENDPOINTS.priority)
    let version = data.version
    if (version) {
      version = version.toUpperCase() === 'IPV6' ? 'IPv6' : 
               version.toUpperCase() === 'IPV4' ? 'IPv4' : version
    }
    ipPriority.value = version || '未知'
  } catch (error) {
    ipPriority.value = '获取失败'
  }
}

async function fetchIpv4DataAndDependents() {
  try {
    const ipv4Data = await fetchIpData(API_ENDPOINTS.ipv4)
    ipv4.value = ipv4Data.ip
    ipv4Addr.value = ipv4Data.address

    if (ipv4Data.ip && ipv4Data.ip !== '无' && ipv4Data.ip !== '获取失败') {
      // 并行执行IP溯源和WebRTC泄露检测
      ipTraceInfo.value = IP_TRACE_LOADING_SKELETON
      const [traceResult] = await Promise.allSettled([
        fetchIpTrace(ipv4Data.ip),
        detectWebRTCLeak(ipv4Data.ip)
      ])
      
      if (traceResult.status === 'fulfilled') {
        ipTraceInfo.value = traceResult.value
      } else {
        ipTraceInfo.value = '溯源请求失败'
      }
    } else {
      ipTraceInfo.value = '无IP，无法溯源'
      webrtcLeak.value = '无法检测 (IPv4获取失败或无IP)'
    }
  } catch (error) {
    ipv4.value = '获取失败'
    ipTraceInfo.value = '溯源请求失败'
    webrtcLeak.value = '检测失败'
  }
}

async function fetchIpv6Data() {
  try {
    const ipv6Data = await fetchIpData(API_ENDPOINTS.ipv6)
    ipv6.value = ipv6Data.ip
    ipv6Addr.value = ipv6Data.address
  } catch (error) {
    ipv6.value = '获取失败'
  }
}

async function fetchNodeTestData() {
  const promises = nodeTestData.value.map(async (node) => {
    try {
      const [v4data, v6data] = await Promise.all([
        fetchIpData(node.v4Url, FETCH_TIMEOUT),
        fetchIpData(node.v6Url, FETCH_TIMEOUT)
      ])
      
      node.v4Value = v4data.ip === TIMEOUT_VALUE.ip 
        ? '超时' 
        : `${v4data.ip}${v4data.address ? ' ' + v4data.address : ''}`
        
      node.v6Value = v6data.ip === TIMEOUT_VALUE.ip 
        ? '超时' 
        : `${v6data.ip}${v6data.address ? ' ' + v6data.address : ''}`
    } catch (error) {
      node.v4Value = '获取失败'
      node.v6Value = '获取失败'
    }
  })
  
  await Promise.allSettled(promises)
}

// 生命周期钩子
onMounted(async () => {
  // 同步获取操作系统和UA信息
  ua.value = navigator.userAgent
  osType.value = detectOS(navigator.userAgent)

  // 并行发起所有数据获取
  await Promise.allSettled([
    fetchIpPriorityData(),
    fetchIpv4DataAndDependents(),
    fetchIpv6Data(),
    fetchNodeTestData()
  ])
})
</script>

<template>
  <div class="card-demo">
    <div class="info-box">
      <div class="info-label">当前访问优先（IPv4/IPv6）：</div>
      <div class="info-value">{{ ipPriority }}</div>

      <div class="info-label">IPv4：</div>
      <div class="info-value">{{ ipv4 }}</div>
      <div class="info-address">{{ ipv4Addr }}</div>

      <div class="info-label">IPv6：</div>
      <div class="info-value">{{ ipv6 }}</div>
      <div class="info-address">{{ ipv6Addr }}</div>

      <div class="trace-label">WebRTC泄露检测：</div>
      <div class="trace-value">{{ webrtcLeak }}</div>

      <div class="os-label">操作系统：</div>
      <div class="os-value">{{ osType }}</div>

      <div class="ua-label">浏览器UA：</div>
      <div class="ua-value">{{ ua }}</div>

      <div class="trace-label">IPv4溯源：</div>
      <div v-if="typeof ipTraceInfo === 'string'" class="trace-value">{{ ipTraceInfo }}</div>
      <table v-else class="ip-trace-table">
        <tbody>
          <tr v-for="(item, index) in ipTraceInfo" :key="index">
            <td>{{ item.label }}</td>
            <td>{{ item.value }}</td>
          </tr>
        </tbody>
      </table>

      <div class="trace-label">节点IP测试：</div>
      <table class="node-test-table">
        <thead>
          <tr>
            <th>节点</th>
            <th>IPv4</th>
            <th>IPv6</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in nodeTestData" :key="node.id">
            <td>{{ node.label }}</td>
            <td>{{ node.v4Value }}</td>
            <td>{{ node.v6Value }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style>
.card-demo {
  font-family: sans-serif;
  color: #fff;
  background: transparent;
}

.info-box {
  background: #222;
  padding: 16px 18px;
  border-radius: 8px;
  box-shadow: 0 1px 6px #0006;
  max-width: 100%;
  margin: 0 auto;
  font-size: 15px;
  box-sizing: border-box;
}

.info-label {
  color: #aaa;
  margin-top: 10px;
  font-size: 13px;
}

.info-value {
  word-break: break-all;
  margin-bottom: 10px;
  color: #fff;
  font-size: 15px;
}

.info-address {
  color: #6cf;
  font-size: 13px;
  margin-bottom: 8px;
}

.os-label {
  color: #aaa;
  margin-top: 18px;
  font-size: 13px;
}

.os-value {
  color: #fff;
  font-size: 13px;
  word-break: break-all;
}

.ua-label {
  color: #aaa;
  margin-top: 18px;
  font-size: 13px;
}

.ua-value {
  color: #fff;
  font-size: 13px;
  word-break: break-all;
}

.trace-label {
  color: #aaa;
  margin-top: 18px;
  font-size: 13px;
}

.trace-value {
  color: #fff;
  font-size: 13px;
  word-break: break-all;
}

.node-test-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 13px;
}

.node-test-table th,
.node-test-table td {
  border: 1px solid #333;
  padding: 8px;
  text-align: left;
  word-break: break-all;
}

.node-test-table th {
  background-color: #333;
  color: #fff;
  font-weight: bold;
}

.node-test-table td {
  background-color: #2a2a2a;
  color: #fff;
}

.node-test-table tbody tr:nth-child(even) td {
  background-color: #252525;
}

.node-test-table td:nth-child(2),
.node-test-table td:nth-child(3) {
  color: #6cf;
}

.ip-trace-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 5px;
  font-size: 13px;
}

.ip-trace-table td {
  border: 1px solid #333;
  padding: 6px 8px;
  text-align: left;
  word-break: break-all;
  background-color: #2a2a2a;
  color: #fff;
}

.ip-trace-table tr:nth-child(even) td {
  background-color: #252525;
}

.ip-trace-table td:first-child {
  color: #fff;
  width: 30%;
}

.ip-trace-table td:last-child {
  color: #6cf;
}
</style>

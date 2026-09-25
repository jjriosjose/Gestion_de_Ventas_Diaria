import packageInfo from '../../package.json'

const technicalVersion=packageInfo.version
const match=technicalVersion.match(/^(\d+\.\d+\.\d+)(?:-([a-zA-Z]+)(?:\.(.+))?)?$/)

const productVersion=match?.[1]||technicalVersion
const channel=(match?.[2]||'').toLowerCase()
const build=match?.[3]||''
const channelLabel=channel?channel.charAt(0).toUpperCase()+channel.slice(1):''
const isTest=/(^|[.-])test([.-]|$)/i.test(technicalVersion)

export const APP_VERSION={
  technical:technicalVersion,
  product:productVersion,
  channel,
  channelLabel,
  build,
  isTest,
  display:`v${productVersion}${channelLabel?` ${channelLabel}`:''}`,
  compact:`v${productVersion}`,
  buildDisplay:build||'Release',
} as const

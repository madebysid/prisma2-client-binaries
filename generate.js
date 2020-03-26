const path = require('path')
const { getGenerator } = require('@prisma/sdk')
const { getLatestAlphaTag } = require('@prisma/fetch-engine')

const main = async () => {
  const schemaPath = path.resolve('./schema.prisma')
  const generator = await getGenerator({
    schemaPath,
    printDownloadProgress: true,
    version: await getLatestAlphaTag(),
  })

  await generator.generate()

  generator.stop()
}

main().catch(e => {
  console.error(e)
})

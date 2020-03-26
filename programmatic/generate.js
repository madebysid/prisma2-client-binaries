const path = require('path')
const { getGenerator } = require('@prisma/sdk')

const main = async () => {
  const schemaPath = path.resolve('./schema.prisma')
  const generator = await getGenerator({
    schemaPath,
    printDownloadProgress: true,
  })

  await generator.generate()

  generator.stop()
}

main().catch(e => {
  console.error(e)
})

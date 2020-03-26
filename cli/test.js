const assert = require('assert')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const main = async () => {
  const users = await prisma.user.findMany()
  assert.equal(users.length, 0)

  console.log('\n\n✔ Prisma Client was generated properly\n\n')
}

main()
  .catch(e => {
    console.error(e)
  })
  .finally(() => {
    prisma.disconnect()
  })

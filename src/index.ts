import crypto from 'crypto'
// @ts-expect-error
import Swarm from 'discovery-swarm'
// @ts-expect-error
import defaults from 'dat-swarm-defaults'
import getPort from 'get-port'
import readline from 'readline'

const peers: any = {}
const myId = crypto.randomBytes(32)
let connSeq = 0
let rl: any

function log(...args: any) {
  if (rl) {
    rl.clearLine()
    rl.close()
    rl = undefined
  }

  console.log(...args)
  askUser()
}

async function askUser() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('Send message: ', (msg: any) => {
    for (const id in peers) {
      if (Object.prototype.hasOwnProperty.call(peers, id)) {
        peers[id].conn.write(msg)
      }

      rl.close()
      rl = undefined
      askUser()
    }
  })
}

const config = defaults({
  id: myId
})
const sw = Swarm(config)

async function init() {
  const port = await getPort()
  console.log(`Server on ${port}`)
  sw.listen(port)

  sw.join('our-fun-channel')
  
  sw.on('connection', (conn: any, info: any) => {
    const seq = connSeq
    const peerId = info.id.toString('hex')
    
    log(`Connected #${seq} to peer: ${peerId}`)

    if (info.initiator) {
      try {
        conn.setKeepAlive(true, 600)
      } catch (err) {
        log('exception', err)
      }
    }

    conn.on('data', (data: any) => {
      log(`Received Message from peer ${peerId} --> ${data.toString()}`)
    })

    conn.on('close', () => {
      log(`Connection ${seq} closed, peer id: ${peerId}`)

      if (peers[peerId].seq === seq) {
        delete peers[peerId]
      }
    })

    if (!peers[peerId]) {
      peers[peerId] = {}
    }

    peers[peerId].conn = conn
    peers[peerId].seq = seq

    connSeq++
  })

  askUser()
}

init()

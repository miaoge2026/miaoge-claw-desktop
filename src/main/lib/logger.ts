
import { dirname, join, resolve } from 'path'
import { app } from 'electron'
import winston from 'winston'


    }

    const fallbackDir = resolve(process.cwd(), '.logs')
    mkdirSync(fallbackDir, { recursive: true })
    return join(fallbackDir, 'app.log')
  }


  }

  cleanup(maxAgeDays = 30): void {
    try {

    }
  }
}

export const logger = new StructuredLogger()
export const normalizeError = serializeError

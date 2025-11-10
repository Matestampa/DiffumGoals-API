const {LOG_VARS} = require("../config/logger_config.js");

const { createLogger, format, transports } = require("winston")


//-------------------------- INFO LOGGER ---------------------------------------------
const infoLogger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.colorize(),
    format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    //Output to console in a human readable format
    new transports.Console(),

    //Output to .log file for cloudWatch ingestion
    new transports.File({ filename: LOG_VARS.infoLogPath })
  ],
});

//-------------------------- ERROR LOGGER ---------------------------------------------

const errorLogger = createLogger({
  level: "error",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }) // captura stack si es Error
  ),
  transports: [
    
    //Output to console in a human readable format
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, stack, ...meta }) => {
          if (message instanceof Error) {
            return `[${timestamp}] ${level}: ${message.name} - ${message.message} ${JSON.stringify(meta)}\n${stack}`;
          }
          return `[${timestamp}] ${level}: ${message} ${JSON.stringify(meta)}`;
        })
      )
    }),

    //Output to JSON file for cloudwatch ingestion
    new transports.File({
      filename: LOG_VARS.errorLogPath,
      format: format.combine(format.json())
    })
  ]
});




module.exports = {infoLogger, errorLogger};
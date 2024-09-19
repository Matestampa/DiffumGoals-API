import express from 'express';

//import routes from './routes';

class Index {
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.server.use(express.json());
  }

  routes() {
    //this.server.use(routes);
  }
}

export default new Index().server;

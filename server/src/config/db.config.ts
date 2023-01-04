export default {
  HOST: "database-1.chxc6kgv0cmb.us-east-2.rds.amazonaws.com",
  USER: "reza_admin",
  PASSWORD: "reza_2021",
  DB: "reza_dev",
  PORT: 5432,
  dialect: "postgres",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

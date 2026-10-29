import swaggerAutoGen from "swagger-autogen";

const doc = {
  info: {
    title: "Prinote API",
    description: "Prinote API",
    version: "1.0.0"
  },
  host: `localhost:${process.env.PORT || 3000}`,
  schemes: ["http"]
};

const outputFile = "./src/docs/swagger.json";
const endpointsFiles = ["./src/app.ts"];

swaggerAutoGen(outputFile, endpointsFiles, doc);

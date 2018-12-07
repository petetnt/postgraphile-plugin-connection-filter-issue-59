/* eslint-disable no-console */
const { Pool } = require('pg');
const { print, graphql } = require('graphql');
const {
  makeRemoteExecutableSchema,
  mergeSchemas,
} = require('graphql-tools');
const {
  default: postgraphile,
  createPostGraphileSchema,
  withPostGraphQLContext,
} = require('postgraphile');
const PostGraphileConnectionFilterPlugin = require('postgraphile-plugin-connection-filter');
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const app = express();

const connection = {
  host: 'localhost',
  user: 'test',
  password: 'test',
  database: 'test',
  port: 5999,
  charset: 'utf8',
};

const pgPool = new Pool({
  ...connection,
  idleTimeoutMillis: 10000,
});

const postgraphOptions = {
  appendPlugins: [
    PostGraphileConnectionFilterPlugin,
  ],
  graphileBuildOptions: {
    connectionFilterAllowedOperators: ['in'],
  },
};

const connectionString = `postgres://test:test@localhost:5999/test`;

const createPostgraphSchemaWithOptions = async () =>
  createPostGraphileSchema(connectionString, 'public', postgraphOptions);

const fetcher = schema => async ({
  query,
  operationName,
  variables,
  context: fetcherContext,
}) =>
  withPostGraphQLContext(
    {
      pgPool,
    },
    async context =>
      graphql(
        schema,
        print(query),
        null,
        { ...fetcherContext, ...context },
        variables,
        operationName,
      ),
  );
  
  const createRemoteExecutableSchemas = async () => {
    const postgraphSchema = await createPostgraphSchemaWithOptions();
    const remoteExecutablePostgraphSchema = makeRemoteExecutableSchema({
      schema: postgraphSchema,
      fetcher: fetcher(postgraphSchema),
    });
  
    return mergeSchemas({
      schemas: [remoteExecutablePostgraphSchema],
    });
  };

const runServer = async () => {
  const schema = await   createRemoteExecutableSchemas();
  const server = new ApolloServer({
    schema,
    context: ({ req }) => ({
      token: req.headers.authorization,
    }),
  });
  server.applyMiddleware({ app });

  app.listen('61234', () => {
    console.log(`Server running on port 66661`);
  });
}

runServer();

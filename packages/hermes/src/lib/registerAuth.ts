'use strict';

import { Application, NextFunction, Request, Response, Router } from 'express';

import { GraphQLOptions } from 'graphql-server-core';
import { graphiqlExpress, graphqlExpress } from 'graphql-server-express';
import { makeExecutableSchema   } from 'graphql-tools';

import { AuthenticationError } from '~graphql/AuthenticationError';
import { HermesGraphQLConnector } from '~graphql/HermesGraphQLConnector';
import { resolvers } from '~graphql/resolvers';
import { typeDefs } from '~graphql/typedefs';
import { IAuthenticationOptions } from './IAuthenticationOptions';

export function registerAuth(
  options: IAuthenticationOptions,
  app: Application | Router
) {
  // Options;

  app.use((request: Request, response: Response, next: NextFunction) => {
    response;

    const sessObj = request.session;
    if (sessObj && (!sessObj._user || !sessObj._hermes)) {
      sessObj.save(err => {
        // Note, [err] can be undefined, in this case it just calls next non-error middleware
        next(err);
      });

      return;
    }
    next();
  });

  // Register graphQL stuff
  const schema: any = makeExecutableSchema({ typeDefs, resolvers });
  const graphQLOptions: GraphQLOptions = {
    debug: true,
    schema
    // Values to be used as context and rootValue in resolvers
    // Context?: any,
    // RootValue?: any,
    // Function used to format errors before returning them to clients
    // FormatError?: Function,
    // Additional validation rules to be applied to client-specified queries
    /// ValidationRules?: Array < ValidationRule >,
    // Function applied for each query in a batch to format parameters before passing them to `runQuery`
    // FormatParams?: Function,
    // Function applied to each response before returning data to clients
    // FormatResponse?: Function,
    // A boolean option that will trigger additional debug logging if execution errors occur
  };
  // Export interface ExpressGraphQLOptionsFunction {
  //    (req?: express.Request, res?: express.Response): GraphQLOptions | Promise<GraphQLOptions>;
  // }
  app.use(
    options.graphQL_url,
    /* fucking messy typescript in modules, hope they will correct in future */
    graphqlExpress((req: Request): any => {
      const asset = HermesGraphQLConnector.createHermesGraphQLConnector(req);

      let errors: AuthenticationError[] = null as any;
      let connector: HermesGraphQLConnector = null as any;
      if (asset instanceof Array) {
        errors = asset;
      } else {
        connector = asset;
      }

      return Promise.resolve({ ...graphQLOptions, context: { connector, errors } });
    })
  );

  app.use('/graphiql', graphiqlExpress({ endpointURL: options.graphQL_url }));
}

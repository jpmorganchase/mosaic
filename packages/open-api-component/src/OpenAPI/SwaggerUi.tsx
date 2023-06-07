'use client';

/**
 * Keep this separate.
 * We want this to be loaded on the client and not the server to prevent
 * issues with swagger-ui-react dependencies.
 *
 * Also, swagger-ui-react needs node 20 to work
 * See --> https://github.com/swagger-api/swagger-ui/issues/8245#issuecomment-1707703135
 *
 */

import SwaggerUI from 'swagger-ui-react';

export default SwaggerUI;

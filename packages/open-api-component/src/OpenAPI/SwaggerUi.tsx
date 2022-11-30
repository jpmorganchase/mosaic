/**
 * Keep this separate.
 * We want this to be loaded on the client and not the server to prevent
 * issues with swagger-ui-react dependencies.
 */

import SwaggerUI from 'swagger-ui-react';

export default SwaggerUI;

// export interface SwaggerUIProps {
//     spec?: object | string | undefined;
//     url?: string | undefined;
//     layout?: string | undefined;
//     onComplete?: ((system: System) => void) | undefined;
//     requestInterceptor?: ((req: Request) => Request | Promise<Request>) | undefined;
//     responseInterceptor?: ((res: Response) => Response | Promise<Response>) | undefined;
//     docExpansion?: 'list' | 'full' | 'none' | undefined;
//     defaultModelExpandDepth?: number | undefined;
//     defaultModelsExpandDepth?: number | undefined;
//     defaultModelRendering?: "example" | "model";
//     queryConfigEnabled?: boolean;
//     plugins?: Plugin[] | undefined;
//     supportedSubmitMethods?: string[] | undefined;
//     deepLinking?: boolean | undefined;
//     showMutatedRequest?: boolean | undefined;
//     showExtensions?: boolean | undefined;
//     presets?: Preset[] | undefined;
//     filter?: string | boolean | undefined;
//     requestSnippetsEnabled?: boolean | undefined;
//     requestSnippets?: object | undefined;
//     displayOperationId?: boolean | undefined;
//     tryItOutEnabled?: boolean | undefined;
//     displayRequestDuration?: boolean;
//     persistAuthorization?: boolean;
//     withCredentials?: boolean;
// }

const { get_env } = require("./get_env.js");

// Parameter Store path prefix per environment, e.g. "/diffumGoals/api/prod/MONGODB_URL"
const SSM_PATH_PREFIX = env => `/diffumGoals/api/${env}/`;

/**
 * Populates process.env for non-local environments.
 * "local" is already handled synchronously by ./get_env.js (dotenv, .env.local).
 * "dev"/"prod" pull parameters from AWS SSM Parameter Store, using the
 * EC2 instance role for credentials (no access keys needed).
 * MUST be awaited before requiring any module that reads process.env at load time.
 */
async function load_env(){
    const APP_ENV = get_env();

    if (APP_ENV === "local") return;

    await load_from_ssm(APP_ENV);
}

async function load_from_ssm(APP_ENV){
    const { SSMClient, GetParametersByPathCommand } = require("@aws-sdk/client-ssm");

    // Region for the SSM client itself must come from the process environment
    // (set via the EC2 launch config/systemd unit), since we can't fetch it from SSM.
    const client = new SSMClient({ region: process.env.AWS_REGION });
    const path = SSM_PATH_PREFIX(APP_ENV);

    let nextToken;
    do{
        const response = await client.send(new GetParametersByPathCommand({
            Path: path,
            Recursive: true,
            WithDecryption: true,
            NextToken: nextToken
        }));

        for (const param of response.Parameters || []){
            const name = param.Name.slice(path.length);
            process.env[name] = param.Value;
        }

        nextToken = response.NextToken;
    } while(nextToken);
}

module.exports = { load_env };

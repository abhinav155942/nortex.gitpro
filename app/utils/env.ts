export function getEnv(context: any): Record<string, string | undefined> {
    if (context?.cloudflare?.env) {
        return context.cloudflare.env;
    }

    if (typeof process !== 'undefined' && process.env) {
        return process.env;
    }

    return {};
}

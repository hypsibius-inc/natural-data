export const getEnvVarOrThrow = (variableName: string): string => {
    const variable = process.env[variableName];
    if (!variable) {
        throw Error(`Environment variable ${variableName} doesn't exist`);
    }
    return variable;
}

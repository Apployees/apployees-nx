export default function getServerEnvironmentVariable(
  key: string, defaultValue?: any): any {

  let value = process.env[key] || env[key];
  if (!value && defaultValue) {
    value = defaultValue;

    // save it so others can access it
    env[key] = defaultValue;
  }

  return value;
}

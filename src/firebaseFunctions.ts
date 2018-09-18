import firebase from "firebase";

export function callFunction<T = any>(
  name: string,
  params: any
): Promise<{ data: T }> {
  return (firebase.functions() as any).call(name, params);
}

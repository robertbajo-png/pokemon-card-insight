export function serve(_handler: (request: Request) => Promise<Response>) {
  // Edge tests call the exported handler directly without opening a listener.
}

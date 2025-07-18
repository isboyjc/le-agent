export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const init = await import('./lib/ai/mcp/mcp-manager').then(
      m => m.initMCPManager
    )
    await init()
  }
}

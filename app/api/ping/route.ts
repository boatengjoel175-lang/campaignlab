export async function GET() {
  return Response.json({ status: "alive", time: new Date() });
}

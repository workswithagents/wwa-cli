import { SetupOptions, SetupOutput, isProvider, Provider } from "./base";
import { generateLocalSetup } from "./local";
import { generateHetznerSetup } from "./hetzner";
import { generateDOSetup } from "./digitalocean";

export type { Provider, SetupOptions, SetupOutput };
export { isProvider };

const generators: Record<Provider, (opts: SetupOptions) => Promise<SetupOutput>> = {
  local: generateLocalSetup,
  hetzner: generateHetznerSetup,
  do: generateDOSetup,
};

export const PROVIDER_DESCRIPTIONS: Record<Provider, string> = {
  local: "Docker Compose stack for local development (registry + gateway + example agent)",
  hetzner: "Provision a CX23 VPS on Hetzner Cloud with Docker and WWA stack",
  do: "Provision a $6 droplet on DigitalOcean with Docker and WWA stack (doctl required)",
};

export const PROVIDERS = Object.keys(generators) as Provider[];

export async function runSetup(opts: SetupOptions): Promise<SetupOutput> {
  const gen = generators[opts.provider];
  if (!gen) {
    throw new Error(
      `Unknown provider "${opts.provider}". Supported: ${PROVIDERS.join(", ")}`
    );
  }
  return gen(opts);
}

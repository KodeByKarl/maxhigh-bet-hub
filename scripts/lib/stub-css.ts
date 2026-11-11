// Lets plain-node tests import React components that `import "./x.css"` (the bundler handles CSS; node has no loader for it).
import { registerHooks } from "node:module";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "export default {};", shortCircuit: true };
    return nextLoad(url, context);
  },
});

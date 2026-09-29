// Jest stub for lucide-react-native (the package ships untransformed .mjs files).
// Every named icon export renders nothing; tests assert on text and roles, not icons.
const Icon = () => null;

module.exports = new Proxy(
  {},
  {
    get: (_target, name) => (name === "__esModule" ? true : Icon)
  }
);

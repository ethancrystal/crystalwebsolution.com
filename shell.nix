# Compatibility shim for legacy nix-shell users
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "crystal-web-solution-dev-shell";

  buildInputs = with pkgs; [
    nodejs_22
    pnpm
    supabase-cli
    git
  ];

  shellHook = ''
    echo ""
    echo "⚡ CD Sportswear USA - Nix Shell Active ⚡"
    echo "Node.js: $(node --version)"
    echo "pnpm:    $(pnpm --version)"
    echo ""
  '';
}

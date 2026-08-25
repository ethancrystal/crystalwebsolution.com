{
  description = "CD Sportswear USA - Dark, cinematic scroll-driven agency homepage";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "crystal-web-solution-shell";

          buildInputs = with pkgs; [
            nodejs_22
            pnpm
            supabase-cli
            git
          ];

          shellHook = ''
            echo ""
            echo "⚡ CD Sportswear USA - Nix Dev Environment ⚡"
            echo "Node.js: $(node --version)"
            echo "pnpm:    $(pnpm --version)"
            echo ""
          '';
        };
      }
    );
}

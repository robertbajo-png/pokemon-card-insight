# Android build configuration

The native Vite build reads this configuration directory instead of the web
installation's environment directory. No environment files belong here.
An empty envPrefix also prevents process VITE_* or other public variables from
being exposed to the packaged preview. Server keys never belong in native builds.

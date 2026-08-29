#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  else
    export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
  fi
fi

if [[ -z "${ANDROID_HOME:-}" ]]; then
  export ANDROID_HOME="${HOME}/Library/Android/sdk"
fi

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME}}"

exec npx expo run:android "$@"

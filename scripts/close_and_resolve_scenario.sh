#!/usr/bin/env bash
set -euo pipefail

PROFILE="${PROFILE:-mvp_deployer}"
MODULE_ADDR="${MODULE_ADDR:-0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575}"
SCENARIO_ADDR="${SCENARIO_ADDR:-0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575}"

echo "Using profile: ${PROFILE}"
echo "Using module:  ${MODULE_ADDR}::outcome_fi"
echo "Scenario addr: ${SCENARIO_ADDR}"

echo
echo "1) Reading current scenario phase..."
SCENARIO_JSON="$(
  movement move view \
    --profile "${PROFILE}" \
    --function-id "${MODULE_ADDR}::outcome_fi::get_scenario" \
    --args "address:${SCENARIO_ADDR}"
)"
echo "${SCENARIO_JSON}"
PHASE="$(echo "${SCENARIO_JSON}" | jq -r '.Result[2] | tonumber')"

if [[ "${PHASE}" == "0" ]]; then
  echo
  echo "2) Advancing phase (Commit -> Reveal)..."
  movement move run \
    --profile "${PROFILE}" \
    --function-id "${MODULE_ADDR}::outcome_fi::advance_phase" \
    --args "address:${SCENARIO_ADDR}" \
    --assume-yes

  echo
  echo "3) Resolving scenario (Reveal -> Resolved)..."
  movement move run \
    --profile "${PROFILE}" \
    --function-id "${MODULE_ADDR}::outcome_fi::resolve" \
    --args "address:${SCENARIO_ADDR}" \
    --assume-yes
elif [[ "${PHASE}" == "1" ]]; then
  echo
  echo "2) Scenario already in Reveal. Resolving now..."
  movement move run \
    --profile "${PROFILE}" \
    --function-id "${MODULE_ADDR}::outcome_fi::resolve" \
    --args "address:${SCENARIO_ADDR}" \
    --assume-yes
elif [[ "${PHASE}" == "2" ]]; then
  echo
  echo "2) Scenario already resolved. No tx sent."
else
  echo "Unexpected phase value: ${PHASE}" >&2
  exit 1
fi

echo
echo "3) Final scenario state:"
movement move view \
  --profile "${PROFILE}" \
  --function-id "${MODULE_ADDR}::outcome_fi::get_scenario" \
  --args "address:${SCENARIO_ADDR}"

echo
echo "4) Final vote counts:"
movement move view \
  --profile "${PROFILE}" \
  --function-id "${MODULE_ADDR}::outcome_fi::get_vote_counts" \
  --args "address:${SCENARIO_ADDR}"

echo
echo "Done."

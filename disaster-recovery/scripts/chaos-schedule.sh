#!/bin/bash

# Chaos Engineering Schedule Script
# Schedules regular chaos experiments for testing

set -e

SCHEDULE="${SCHEDULE:-weekly}"  # Options: daily, weekly, monthly

echo "=== Chaos Engineering Schedule ==="
echo "Schedule: ${SCHEDULE}"
echo ""

case $SCHEDULE in
  daily)
    echo "Setting up daily chaos experiments..."
    
    # Daily pod kill test
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-pod-kill
  namespace: lumina-primary
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: chaos
            image: chaos-mesh/chaos-mesh:latest
            command: ["kubectl", "apply", "-f", "/chaos/pod-kill-experiment.yaml"]
          restartPolicy: OnFailure
EOF
    
    # Daily network delay test
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-network-delay
  namespace: lumina-primary
spec:
  schedule: "0 3 * * *"  # 3 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: chaos
            image: chaos-mesh/chaos-mesh:latest
            command: ["kubectl", "apply", "-f", "/chaos/network-delay-experiment.yaml"]
          restartPolicy: OnFailure
EOF
    ;;
    
  weekly)
    echo "Setting up weekly chaos experiments..."
    
    # Weekly failover test
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-failover-test
  namespace: lumina-primary
spec:
  schedule: "0 3 * * 0"  # 3 AM Sunday
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: chaos
            image: chaos-mesh/chaos-mesh:latest
            command: ["./scripts/test-recovery.sh", "TEST_TYPE=failover"]
          restartPolicy: OnFailure
EOF
    
    # Weekly database stress test
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-db-stress
  namespace: lumina-primary
spec:
  schedule: "0 4 * * 0"  # 4 AM Sunday
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: chaos
            image: chaos-mesh/chaos-mesh:latest
            command: ["kubectl", "apply", "-f", "/chaos/io-delay-experiment.yaml"]
          restartPolicy: OnFailure
EOF
    ;;
    
  monthly)
    echo "Setting up monthly chaos experiments..."
    
    # Monthly full recovery test
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-full-test
  namespace: lumina-primary
spec:
  schedule: "0 2 1 * *"  # 2 AM on 1st of month
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: chaos
            image: chaos-mesh/chaos-mesh:latest
            command: ["./scripts/test-recovery.sh", "TEST_TYPE=full"]
          restartPolicy: OnFailure
EOF
    ;;
    
  *)
    echo "Unknown schedule: ${SCHEDULE}"
    echo "Valid options: daily, weekly, monthly"
    exit 1
    ;;
esac

echo ""
echo "Chaos engineering schedule configured"
echo "Experiments will run automatically based on schedule"
echo "Monitor results via: kubectl get cronjobs -n lumina-primary"

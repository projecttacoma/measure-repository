#!/usr/bin/env bash
#This script is meant to be run inside a docker instance (on build)
wget http://pki.mitre.org/MITRE-chain.txt -P /usr/local/share/ca-certificates/
wget http://pki.mitre.org/ZScaler_Root.crt -P /usr/local/share/ca-certificates/
cat /usr/local/share/ca-certificates/ZScaler_Root.crt >> /usr/local/share/ca-certificates/MITRE-chain.txt
mv /usr/local/share/ca-certificates/MITRE-chain.txt /usr/local/share/ca-certificates/MITRE-chain.crt
chmod 644 /usr/local/share/ca-certificates/MITRE-chain.crt
rm /usr/local/share/ca-certificates/ZScaler_Root.crt
update-ca-certificates

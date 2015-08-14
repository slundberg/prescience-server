#! /bin/bash

# our first arg should be either "train" or "validation"
DATA_DIR=/projects/leelab/data/ML_OR/data/merged/merged.raw$1/

# load the password from disk
PASS=`cat elasticsearch.admin.password`

# build the dynamic parts of the logstash configuration
# (these are the parts depending on the password and train vs. validation)
read -d '' CONFIG <<EOF
filter {
    mutate { add_field => { "learningLabel" => "$1" } }
}
output {
    elasticsearch {
        protocol => "http"
        user => "admin"
        index => "prescience"
        password => "$PASS"
        document_type => "%{type}"
        document_id => "%{_id}"
    }
}
EOF

# run logstash
find $DATA_DIR -type f | xargs -n 10 cat | logstash/bin/logstash --config logstash.config -e "$CONFIG"

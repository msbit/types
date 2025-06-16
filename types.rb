#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'
require 'open3'

exit unless ARGV.count == 3

file = ARGV[0]
line = ARGV[1]
offset = ARGV[2]

def read_response(io)
  content_length = /\AContent-Length: (\d*)\r\n\Z/.match(io.readline)[1].to_i
  io.readline # newline
  JSON.parse(io.read(content_length))
end

def wait_response(io)
  ios, = IO.select([io], nil, nil, 0.1)
  return nil if ios.nil?

  read_response(io)
end

Open3.popen2('npx tsserver') do |stdin, stdout, _wait_thr|
  wait_response(stdout)

  stdin.puts({
    seq: 0,
    type: 'request',
    command: 'open',
    arguments: {
      file: File.realpath(file)
    }
  }.to_json)

  response = nil

  70.times do
    response = wait_response(stdout)
    next if response.nil?

    break if response['type'] == 'event' && response['event'] == 'projectLoadingFinish'
  end

  stdin.puts({
    seq: 1,
    type: 'request',
    command: 'quickinfo',
    arguments: {
      file: File.realpath(file),
      line: line.to_i,
      offset: offset.to_i
    }
  }.to_json)

  10.times do
    response = wait_response(stdout)
    next if response.nil?

    break if response['type'] == 'response' && response['command'] == 'quickinfo' && response['request_seq'] == 1
  end

  puts(response['success'] ? response['body']['displayString'] : response['message'])
end

#!/usr/bin/env perl
use strict;
use warnings;
use Getopt::Long qw(:config auto_help);
use JSON;
use LWP::UserAgent;
use Time::Piece;

my $now = gmtime;
my $year = $now->year;
my $month = $now->mon;

GetOptions(
    'year=i'  => \$year,
    'month=i' => \$month,
) or exit 1;

my $user = shift @ARGV;

die "<username> is required" unless defined $user;
die "Invalid <username>: $user" unless $user =~ /^[a-zA-Z][a-zA-Z0-9]{0,9}$/;
die "Invalid --month: $month" unless $month >= 1 and $month <= 12;

my $json = JSON->new;
my $user_agent = LWP::UserAgent->new;
my $url = "http://metakgs.org/api/archives/$user/$year/$month";
my $response = $user_agent->get( $url );

die "Failed to GET $url: ", $response->status_line if !$response->is_success;
print $json->pretty->encode( $json->decode($response->content) );

__END__

=head1 SYNOPSIS

  archives.pl [-y year] [-m month] <username>


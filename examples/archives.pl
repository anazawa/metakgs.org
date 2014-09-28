#!/usr/bin/env perl
use strict;
use warnings;
use Getopt::Long;
use JSON;
use LWP::UserAgent;
use Pod::Usage;
use Time::Piece;

my $now = gmtime;
my $year = $now->year;
my $month = $now->mon;

GetOptions(
    'year=i'  => \$year,
    'month=i' => \$month,
) or exit 1;

my ( $command, $user ) = @ARGV;

pod2usage(2) unless $command and $user;
die "Unknown command '$command'" unless $command eq 'search';

my $json = JSON->new;
my $user_agent = LWP::UserAgent->new;
my $url = "http://metakgs.org/api/archives/$user/$year/$month";
my $response = $user_agent->get( $url );

die "Failed to GET $url: ", $response->status_line if !$response->is_success;
print $json->pretty->encode( $json->decode($response->content) );

__END__

=head1 SYNOPSIS

  archives.pl search [-y year] [-m month] <username>


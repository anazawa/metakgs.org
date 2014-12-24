package MetaKGS::Web::Text::Xslate::Functions;
use strict;
use warnings;
use Exporter qw/import/;
use File::Spec;
use MetaKGS::Web;

our @EXPORT = qw(
    c
    uri_with
    uri_for
    static_file
    num2fullmon
);

our %StaticFile;

sub c        { MetaKGS::Web->context }
sub uri_with { MetaKGS::Web->context->request->uri_with(@_) }
sub uri_for  { MetaKGS::Web->context->uri_for(@_) }

sub static_file {
    my $file = shift;
    my $c = MetaKGS::Web->context;

    unless ( exists $StaticFile{$file} ) {
        my $fullpath = File::Spec->catfile( $c->base_dir, $file );
        $StaticFile{$file} = ( stat $fullpath )[9];
    }

    $c->uri_for($file, {
        t => $StaticFile{$file} || 0,
    });
}

sub num2fullmon {
    my $mon = shift;

    [qw(
        January
        February
        March
        April
        May
        June
        July
        August
        September
        October
        November
        December
    )]->[$mon-1];
}

1;
